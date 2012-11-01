
import datetime
import logging
import os
import random
import re
import json
import jinja2
from google.appengine.ext import db

class Room(db.Model):
	"""All the data we store for a room"""
	user1 = db.StringProperty()
	user2 = db.StringProperty()
	stun_server = db.StringProperty()
	turn_server = db.StringProperty()
	debug = db.BooleanProperty()
	seed = db.IntegerProperty();

	def __str__(self):
		str = '['
		if self.user1:
			str += self.user1
		if self.user2:
			str += ', ' + self.user2
		str += ']'
		return str

	def get_occupancy(self):
		occupancy = 0
		if self.user1:
			occupancy += 1
		if self.user2:
			occupancy += 1
		return occupancy

	def get_other_user(self, user):
		if user == self.user1:
			return self.user2
		elif user == self.user2:
			return self.user1
		return None

	def has_user(self, user):
		return (user and (user == self.user1 or user == self.user2))

	def add_user(self, user):
		if not self.user1:
			if user != self.user2:
				self.user1 = user
				self.put()
		elif not self.user2:
			if user != self.user1:
				self.user2 = user
				self.put()

	def remove_user(self, user):
		if user == self.user2:
			# second user disconnected
			self.user2 = None
			self.put()
		if user == self.user1:
			# first user disconnected, change initiator if any
			self.user1 = self.user2
			self.user2 = None
			#if self.get_occupancy() > 0:
			self.put()
