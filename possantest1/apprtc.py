#!/usr/bin/python2.4

import datetime
import logging
import os
import random
import re
import json
import jinja2
import webapp2
import Cookie
from google.appengine.api import channel
from google.appengine.ext import db
import model

jinja_environment = jinja2.Environment(
		loader=jinja2.FileSystemLoader(os.path.dirname(__file__)))

def generate_random(len):
	word = ''
	for i in range(len):
		word += random.choice('0123456789abcdefghijklmnopqrstuvwxyz')
	return word

def sanitize(key):
	return re.sub('[^a-zA-Z0-9\-]', '-', key);

def make_token(room, user):
	return room.key().id_or_name() + '/' + user

def randomize_stun_server():
	stun_config = 'stun:' + 'stun.l.google.com:19302'
	return stun_config

def make_pc_config(stun_server, turn_server):
	servers = []
	if stun_server:
		stun_config = 'stun:{}'.format(stun_server)
	else:
		stun_config = 'stun:' + 'stun.l.google.com:19302'
	servers.append({'url':stun_config})
	if turn_server:
		turn_config = 'turn:{}'.format(turn_server)
		servers.append({'url':turn_config, 'credential':''})
	return {'iceServers':servers}

def set_cookie(handler, cookie, value):
	C1 = Cookie.SimpleCookie()
	C1[cookie] = value
	handler.response.headers.add_header("Set-Cookie", C1.output(header=''))

def get_user_cookie(handler):
	#webapp2.RequestHandler
	if handler.request.get('randomuser'):
		c = generate_random(10);
		set_cookie(handler, 'user', c)
		return c
	c = handler.request.get('user')
	if c:
		set_cookie(handler, 'user', c)
		return c
	c = ''
	if 'user' in handler.request.cookies:
		c = handler.request.cookies['user']
	if not c:
		c = generate_random(10);
		set_cookie(handler, 'user', c)
	return c


class ConnectPage(webapp2.RequestHandler):

	def post(self):
		key = self.request.get('from')
		room_key, user = key.split('/');
		logging.info('User ' + user + ' connected to room ' + room_key)


class DisconnectPage(webapp2.RequestHandler):

	def post(self):
		user = get_user_cookie(self)
		# room.remove_user(user)
		logging.info('User '+user+' disconnected.')
		message = self.request.body
		logging.info('message='+message)

class MessagePage(webapp2.RequestHandler):
	def post(self):
		logging.info('in messagepage::post')
		message = self.request.body
		logging.info('message='+message)
		message_obj = json.loads(message)
		user = get_user_cookie(self)
		logging.info('user='+user)
		room_key = self.request.get('r')
		room = model.Room.get_by_key_name(room_key)

		# handle special messages here...

		if message_obj['type'] == 'game-set-meta':
			k = message_obj['key']
			v = message_obj['value']
			logging.info("set-meta key=" + k)
			logging.info("set-meta value=" + v)
			o = {}
			try:
				o = json.loads(room.meta)
			except Exception:
				pass
			o[k] = v
			room.meta = json.dumps(o)
			logging.info("set-meta json=" + room.meta)
			pass

		if message_obj['type'] == 'bye':
			pass

		logging.info('room='+room_key)
		if not room:
			logging.warning('Unknown room ' + room_key)
			return

		other_user = room.get_other_user(user)

		if message_obj['type'] == 'game-set-meta':
			k = message_obj['key']
			v = message_obj['value']
			logging.info("set-meta key=" + k)
			logging.info("set-meta value=" + v)
			o = {}
			try:
				o = json.loads(room.meta)
			except Exception:
				pass
			o[k] = v
			room.meta = json.dumps(o)
			logging.info("set-meta json=" + room.meta)
			#if other_user:
			#	channel.send_message(room_key+'/'+other_user, message)

		if message_obj['type'] == 'bye':
			# room.remove_user(user)
			logging.info('User ' + user + ' quit from room ' + room_key)
			# if room is in playing-state, tell everyone that we
			# changed state to paused
			if room.meta['state'] == 'playing':
				room.meta['state'] = 'paused'

		room.touch()
		room.put()

		if other_user:
			channel.send_message(room_key+'/'+other_user, message)

		if '_broadcast' in message_obj:
			if message_obj['_broadcast']:
				# do broadcast, (send to me too!)
				channel.send_message(room_key+'/'+user, message)


class CreatePage(webapp2.RequestHandler):

	def get(self):
		user = get_user_cookie(self)
		randomroom = generate_random(6)
		self.redirect('/room/'+randomroom)

class RoomPage(webapp2.RequestHandler):

	def get(self, room_key):
		novideo = self.request.get('novideo', '0')
		user = get_user_cookie(self)
		room = model.Room.get_by_key_name(room_key)
		if not room:
			room = model.Room(key_name = room_key)
			room.reset()
		elif room.expired():
			room.reset()
		room.add_user(user)
		room.touch()
		room.put()
		token = channel.create_channel(room_key+'/'+user)
		# room.put()
		pc_config = make_pc_config(room.stun_server, room.turn_server)
		room_link = 'https://possantest1.appspot.com/?r=' + room_key
		logging.info("user=%s" % (user))
		logging.info("room.user1=%s" % (room.user1))
		logging.info("room.user2=%s" % (room.user2))
		logging.info("room.seed=%s" % (room.seed))
		logging.info("room.meta=%s" % (room.meta))
		initiator = 0
		if user == room.user1:
			initiator = 1
		logging.info("initator=%s" % (initiator))

		o = {}
		try:
			o = json.loads(room.meta)
		except Exception:
			pass

		template_values = {
			'token': token,
			'me': user,
			'novideo': novideo,
		 	'room_key': room_key,
			'room_link': room_link,
			'room_user1': room.user1,
			'room_user2': room.user2,
			'room_seed': room.seed,
			'room_meta': json.dumps(o),
			'initiator': initiator,
			'pc_config': json.dumps(pc_config)
		}
		template = jinja_environment.get_template('index.html')
		self.response.out.write(template.render(template_values))
		#logging.info('User ' + user + ' added to room ' + room_key)
		#logging.info('Room ' + room_key + ' has state ' + str(room))


class MainPage(webapp2.RequestHandler):

	def get(self):
		user = get_user_cookie(self)
		template_values = { 'user': user }
		template = jinja_environment.get_template('menu.html')
		self.response.out.write(template.render(template_values))

class OnePagePage(webapp2.RequestHandler):

	def get(self):
		template_values = {}
		template = jinja_environment.get_template('onepage.html')
		self.response.out.write(template.render(template_values))


app = webapp2.WSGIApplication([
		('/', MainPage),
		('/1', OnePagePage),
		('/create', CreatePage),
		('/message', MessagePage),
		(r'/room/([a-z0-9]+)', RoomPage),
		('/_ah/channel/connected/', ConnectPage),
		('/_ah/channel/disconnected/', DisconnectPage)
	], debug=True)
